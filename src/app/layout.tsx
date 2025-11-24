import type { Metadata } from "next";
import "./globals.css";
import AdminShell from "@/components/admin/AdminShell";
import I18nProvider from "@/components/I18nProvider";

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
				<I18nProvider>
					<AdminShell>{children}</AdminShell>
				</I18nProvider>
			</body>
		</html>
	);
}
