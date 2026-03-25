export const metadata = {
  title: "ApproveSG",
  description: "Approval Workflows as a Shared Service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
