import Layout from "@/components/layout/Layout";

export default function SecureLoginsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
