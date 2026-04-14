import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Logo */}
        <div className="space-y-3">
          <div className="text-6xl">💞</div>
          <h1 className="text-5xl font-black text-gray-900">Matchmaker</h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Find someone who truly shares your values, life goals, and priorities.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 gap-3 text-left">
          {[
            { icon: "🧠", title: "Deep Compatibility", desc: "30-question personality & values assessment" },
            { icon: "🎯", title: "Weighted Matching", desc: "You decide what matters most to you" },
            { icon: "📊", title: "Transparent Scores", desc: "See exactly why you're compatible" },
            { icon: "🔒", title: "Secure by Design", desc: "2FA, Google & Meta sign-in supported" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="font-bold text-gray-800">{f.title}</p>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/register"
            className="block w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:opacity-90 transition-opacity"
          >
            Get Started — It&apos;s Free
          </Link>
          <p className="text-gray-500 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-rose-500 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
