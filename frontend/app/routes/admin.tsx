import type { MetaFunction } from 'react-router';
import AdminPage from '../pages/admin/AdminPage';

export const meta: MetaFunction = () => [
    { title: 'Admin | BizInsight' },
    { name: 'robots', content: 'noindex, nofollow' },
];

// The admin is a client-side app behind a login; the server only renders its loading state.
export default function Admin() {
    return <AdminPage />;
}
