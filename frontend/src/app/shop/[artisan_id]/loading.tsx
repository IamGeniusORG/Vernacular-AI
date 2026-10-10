export default function LoadingStorefront() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans animate-pulse flex flex-col">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="h-6 w-48 bg-slate-200 rounded-md mb-2"></div>
          <div className="h-3 w-32 bg-slate-200 rounded-md"></div>
        </div>
        <div className="hidden sm:block h-8 w-32 bg-slate-200 rounded-full"></div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="w-full bg-slate-200 aspect-[3/4]"></div>
              <div className="p-5">
                <div className="h-5 w-3/4 bg-slate-200 rounded-md mb-2"></div>
                <div className="h-4 w-1/2 bg-slate-200 rounded-md mb-4"></div>
                <div className="flex gap-2 mb-6">
                  <div className="h-6 w-16 bg-slate-200 rounded-lg"></div>
                  <div className="h-6 w-16 bg-slate-200 rounded-lg"></div>
                </div>
                <div className="h-10 w-full bg-slate-200 rounded-xl mt-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
