# -*- coding: utf-8 -*-
"""Restore documents tab: OPS main card + New/Close + conditional upload."""
from pathlib import Path

path = Path(__file__).resolve().parent / "src/app/customers/_detail/CustomerDetailPage.tsx"
s = path.read_text(encoding="utf-8")

i0 = s.find('{activeTab === "pieces" && (')
if i0 < 0:
    raise SystemExit("pieces start not found")

needle_compliance = '\n\t\t\t\t{activeTab === "compliance" && customer && ('
i2 = s.find(needle_compliance, i0)
if i2 < 0:
    raise SystemExit("compliance boundary not found")

chunk = s[i0:i2]
last_close = chunk.rfind("\t\t\t\t)}")
if last_close < 0:
    raise SystemExit("outer )} for pieces not found")
i1 = i0 + last_close + len("\t\t\t\t)}")

idx_docs = s.find("{documents.length === 0 ? (", i0)
if idx_docs < 0 or idx_docs >= i1:
    raise SystemExit("documents list marker missing")
list_rest = s[idx_docs:i1]
if list_rest.startswith("{documents"):
    list_rest = "\t\t\t\t\t\t\t\t" + list_rest

form_part = """										{(docType === "ID_CARD" || docType === "PASSPORT") && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
											<div>
												<label className="block text-sm font-medium text-slate-600 mb-1.5">
													{t("customer.detail.documents.identityNumber")} <span className="text-red-500">*</span>
												</label>
												<input
													type="text"
													className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
													value={identityDocNumber}
													onChange={e => setIdentityDocNumber(e.target.value)}
													maxLength={64}
													autoComplete="off"
												/>
											</div>
											<div>
												<label className="block text-sm font-medium text-slate-600 mb-1.5">
													{t("customer.detail.documents.identityExpires")} <span className="text-red-500">*</span>
												</label>
												<input
													type="date"
													className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
													value={identityDocExpiresOn}
													onChange={e => setIdentityDocExpiresOn(e.target.value)}
												/>
											</div>
										</div>
									)}
									<div
										className={
											docType === "ID_CARD"
												? "grid grid-cols-1 md:grid-cols-4 gap-5"
												: "grid grid-cols-1 md:grid-cols-3 gap-5"
										}
									>
										<div>
											<label className="block text-sm font-medium text-slate-600 mb-1.5">{t("customer.detail.documents.fileType")}</label>
											<select
												className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
												value={docType}
												onChange={e => {
													const v = e.target.value as DocumentType;
													setDocType(v);
													if (v !== "ID_CARD") setIdCardSide("RECTO");
													if (v !== "ID_CARD" && v !== "PASSPORT") {
														setIdentityDocNumber("");
														setIdentityDocExpiresOn("");
													}
												}}
											>
												{(["ID_CARD", "PASSPORT", "PROOF_OF_ADDRESS", "REGISTRATION_DOC", "SELFIE"] as const).map(
													code => (
														<option key={code} value={code}>
															{t(`customer.detail.documents.types.${code}`)}
														</option>
													)
												)}
											</select>
										</div>
										{docType === "ID_CARD" ? (
											<div>
												<label className="block text-sm font-medium text-slate-600 mb-1.5">
													{t("customer.detail.documents.idCardSide")}
												</label>
												<select
													className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
													value={idCardSide}
													onChange={e => setIdCardSide(e.target.value as IdCardSide)}
												>
													<option value="RECTO">{t("customer.detail.documents.idCardSideRecto")}</option>
													<option value="VERSO">{t("customer.detail.documents.idCardSideVerso")}</option>
												</select>
											</div>
										) : null}
										<div>
											<label className="block text-sm font-medium text-slate-600 mb-1.5">{t("customer.detail.documents.file")}</label>
											<input
												type="file"
												id="file-upload"
												accept={
													docType === "SELFIE" ? "image/*" : undefined
												}
												onChange={e => setDocFile(e.target.files?.[0] ?? null)}
												className="hidden"
											/>
											<label
												htmlFor="file-upload"
												className="flex items-center justify-center w-full min-h-[42px] px-4 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-600 cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors"
											>
												<svg className="w-5 h-5 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
												</svg>
												{docFile ? docFile.name : t("customer.detail.documents.chooseFile")}
											</label>
											{docFile && (
												<p className="mt-1.5 text-xs text-slate-500">
													{t("customer.detail.documents.fileSelected")}: <span className="font-medium text-slate-600">{docFile.name}</span>
												</p>
											)}
										</div>
										<div className="flex items-end">
											<Button type="submit" disabled={!docFile || docSubmitting} className="w-full min-h-[42px]">
												{docSubmitting ? t("customer.detail.documents.uploading") : t("customer.detail.documents.uploadButton")}
											</Button>
										</div>
									</div>"""

list_open = """						<div className="overflow-hidden rounded-ops-lg border border-ops-border bg-ops-surface-muted/30">
							<div className="border-b border-ops-border bg-ops-surface-muted/50 px-4 py-3 sm:px-5">
								<h3 className="text-sm font-semibold text-ops-fg">{t("customer.detail.documents.saved")}</h3>
							</div>
							<div className="p-6 sm:p-8">
"""

new_block = (
    """				{activeTab === "pieces" && (
					<div className={OPS_CARD_SHELL}>
						<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center justify-between gap-4`}>
							<div className="flex min-w-0 flex-1 items-start gap-3">
								<div
									className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ops-fg-muted text-white sm:flex"
									aria-hidden
								>
									<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.75}
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
								</div>
								<div className="min-w-0">
									<h2 className="text-lg font-semibold tracking-tight text-ops-fg sm:text-xl">{t("customer.detail.documents.title")}</h2>
									<p className="mt-1 text-xs text-ops-fg-muted sm:text-sm">{t("customer.detail.documents.subtitle")}</p>
								</div>
							</div>
							{showDocumentUpload ? (
								<Button variant="outline" size="sm" type="button" onClick={() => setShowDocumentUpload(false)} className="shrink-0">
									{t("customer.detail.documents.closeUpload")}
								</Button>
							) : (
								<Button variant="outline" size="sm" type="button" onClick={() => setShowDocumentUpload(true)} className="shrink-0">
									{t("customer.detail.documents.newButton")}
								</Button>
							)}
						</div>
						<div className="space-y-8 p-6 sm:p-8">
							{showDocumentUpload ? (
								<div className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface shadow-ops-card">
									<div className="border-b border-ops-border bg-ops-surface-muted px-5 py-3.5">
										<h3 className="text-sm font-semibold text-slate-800">{t("customer.detail.documents.upload")}</h3>
									</div>
									<div className="p-6">
										<form onSubmit={submitDocument} className="space-y-4">
"""
    + form_part
    + """										</form>
									</div>
								</div>
							) : null}
"""
    + list_open
    + list_rest
    + "\n"
)

s2 = s[:i0] + new_block + s[i1:]

# Old closings: ternary )}, p-6, card shell, space-y-6, outer )}. New needs one more </div> for space-y-8 + main OPS.
close_needle = "\t\t\t\t\t\t\t\t)}\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t)}"
close_repl = "\t\t\t\t\t\t\t\t)}\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t)}"
if close_needle not in s2:
    raise SystemExit("closing needle not found:\n" + repr(close_needle))
s2 = s2.replace(close_needle, close_repl, 1)

path.write_text(s2, encoding="utf-8")
print("ok", "pieces", i0, "->", i1, "delta", i1 - i0, "new len", len(new_block))
