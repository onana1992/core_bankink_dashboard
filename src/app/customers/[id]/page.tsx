"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import { customersApi } from "@/lib/api";
import { customerDetailPath } from "@/lib/customerRoutes";

/**
 * Ancienne URL `/customers/:id` : redirige vers `/customers/person/:id` ou
 * `/customers/business/:id` selon le type enregistré.
 */
export default function CustomerDetailLegacyRedirectPage() {
	const { t } = useTranslation();
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const id = useMemo(() => Number(params?.id), [params]);
	const [fetchFailed, setFetchFailed] = useState(false);

	const invalidId = params?.id == null || params.id === "" || Number.isNaN(id) || id < 1;

	useEffect(() => {
		if (invalidId) return;
		let cancelled = false;
		void (async () => {
			try {
				const customer = await customersApi.get(id);
				if (cancelled) return;
				router.replace(customerDetailPath(customer.id, customer.type));
			} catch {
				if (!cancelled) setFetchFailed(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [id, invalidId, router]);

	if (invalidId || fetchFailed) {
		return (
			<div className="space-y-4">
				<p className="text-red-700">{t("customer.detail.notFound")}</p>
				<Link href="/customers">
					<Button>{t("customer.detail.backToList")}</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center py-20">
			<div className="text-center">
				<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
				<p className="text-gray-600">{t("customer.detail.loading")}</p>
			</div>
		</div>
	);
}
