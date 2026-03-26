import "@/app/globals.css";

export const metadata = {
  title: "ApproveSG",
};

/**
 * Embed layout — no sidebar, no gov banner, minimal chrome.
 * Used for iframe embedding by consuming products.
 */
export default function EmbedLayout({
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
