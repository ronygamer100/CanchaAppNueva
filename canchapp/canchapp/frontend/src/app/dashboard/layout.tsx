import OwnerSidebar from '@/components/OwnerSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <OwnerSidebar>{children}</OwnerSidebar>;
}
