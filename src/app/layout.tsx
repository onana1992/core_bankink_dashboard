import type { Metadata } from "next";
import "./globals.css";
import AdminShell from "@/components/admin/AdminShell";
import I18nProvider from "@/components/I18nProvider";
import { AuthProvider } from "@/contexts/AuthContext";

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
					<AuthProvider>
						<AdminShell>{children}</AdminShell>
					</AuthProvider>
				</I18nProvider>
			</body>
		</html>
	);
}
