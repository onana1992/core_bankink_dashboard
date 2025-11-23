import type { Metadata } from "next";
import "./globals.css";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
	title: "Core Admin",
	description: "Core banking admin interface"
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				<AdminShell>{children}</AdminShell>
			</body>
		</html>
	);
}
