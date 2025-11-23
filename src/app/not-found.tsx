export default function NotFound() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
			<h1 className="text-4xl font-bold">404 — Page not found</h1>
			<p className="text-muted-foreground">
				The page you are looking for doesn&apos;t exist or has been moved.
			</p>
			<a
				href="/"
				className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
			>
				Go back home
			</a>
		</div>
	);
}

