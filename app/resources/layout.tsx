import Layout from "@/components/layout/Layout";

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
