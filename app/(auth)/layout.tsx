export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">💞</div>
          <h1 className="text-2xl font-black text-gray-900">Matchmaker</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
