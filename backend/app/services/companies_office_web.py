"""
Temporary source for NZBN primary business data (phone numbers, email addresses, websites, trading
names, public addresses, ...): the NZBN tab of a company's page on the Companies Office website.

It stands in until the NZBN API subscription is approved. Results are stored with
source="companies_office_web" so they can be refreshed from the API later. Requests are sequential,
paced (see app/services/enrichment_jobs.py) and identify themselves, and a job stops as soon as the
site refuses them.
"""
import http.cookiejar
import re
import urllib.error
import urllib.request
from html.parser import HTMLParser
from typing import Dict, List, Optional

from app.core.config import settings

PAGE_URL = "https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/{number}/nzbnPbdView"
SOURCE = "companies_office_web"

# <label for="..."> on the page -> key in the parsed result
FIELDS = {
    "phone": "phones",
    "email": "emails",
    "website": "websites",
    "tradingName": "trading_names",
    "tradingAreas": "trading_areas",
    "businessClassification": "industries",
    "gstNumber": "gst_numbers",
    "ABNNumber": "abn_numbers",
    "officeAddress": "office_addresses",
    "postalAddress": "postal_addresses",
    "deliveryAddress": "delivery_addresses",
    "invoiceAddress": "invoice_addresses",
}


class PageError(Exception):
    """The response couldn't be read as a company's NZBN details page."""


class BlockedError(PageError):
    """The site refused the request (e.g. 403/429); stop fetching rather than retry."""


class _NzbnDetailsParser(HTMLParser):
    """
    Collects each field's values from
        <label for="phone">Phone Number(s):</label> <div class="nzbnDetails"> value <br> value </div>
    splitting a field's values on <br>, links and nested divs.
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.result: Dict[str, List[str]] = {key: [] for key in FIELDS.values()}
        self.labels_seen = 0
        self._pending: Optional[str] = None  # field whose label was just read
        self._field: Optional[str] = None  # field whose value div is being read
        self._depth = 0
        self._buffer: List[str] = []

    def _flush(self):
        value = re.sub(r"\s+", " ", "".join(self._buffer)).strip(" ,")
        if value and value not in self.result[self._field]:
            self.result[self._field].append(value)
        self._buffer = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if self._field:
            if tag == "div":
                self._depth += 1
            if tag in ("br", "div", "a"):
                self._flush()
            return
        if tag == "label" and attributes.get("for") in FIELDS:
            self._pending = FIELDS[attributes["for"]]
            self.labels_seen += 1
        elif tag == "div" and self._pending and "nzbnDetails" in (attributes.get("class") or ""):
            self._field, self._pending, self._depth = self._pending, None, 1
        elif tag in ("label", "td", "tr", "table", "h3"):
            # The value has to follow its label directly; anything else means this label has none.
            self._pending = None

    def handle_endtag(self, tag):
        if not self._field:
            return
        if tag == "a":
            self._flush()
        elif tag == "div":
            self._depth -= 1
            self._flush()
            if self._depth == 0:
                self._field = None

    def handle_data(self, data):
        if self._field:
            self._buffer.append(data)


def parse_nzbn_details(markup: str) -> Dict[str, List[str]]:
    parser = _NzbnDetailsParser()
    parser.feed(markup)
    parser.close()
    if parser.labels_seen < len(FIELDS) // 2:
        raise PageError("the NZBN details fields were not on the page")
    return parser.result


class Fetcher:
    """HTTP client for one job; it keeps the cookies the site's firewall sets."""

    def __init__(self):
        self._opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def fetch(self, company_number: str) -> Dict[str, List[str]]:
        if not re.fullmatch(r"\d+", company_number or ""):
            raise PageError(f"not a company number: {company_number!r}")
        request = urllib.request.Request(
            PAGE_URL.format(number=company_number),
            headers={"User-Agent": settings.CO_WEB_USER_AGENT, "Accept": "text/html"},
        )
        try:
            with self._opener.open(request, timeout=30) as response:
                markup = response.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code in (403, 429) or e.code >= 500:
                raise BlockedError(f"Companies Office answered HTTP {e.code}")
            raise PageError(f"HTTP {e.code}")
        except (urllib.error.URLError, TimeoutError) as e:
            raise PageError(f"request failed: {e}")
        return parse_nzbn_details(markup)
