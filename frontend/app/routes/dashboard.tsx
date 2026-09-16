import { redirect } from 'react-router';

// The old dashboard's charts now live on the overview.
export function loader() {
    throw redirect('/', 301);
}

export default function Dashboard() {
    return null;
}
