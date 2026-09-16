import { data } from 'react-router';

// Anything not matched by another route is a real 404 (status code included), rendered by the
// root ErrorBoundary.
export function loader() {
    throw data({ message: 'Page not found' }, { status: 404 });
}

export default function NotFound() {
    return null;
}
