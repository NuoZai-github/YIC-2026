import DetectorUI from '@/components/DetectorUI';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      {/* 
        This is a Next.js application tailored for elderly users. 
        It focuses on high contrast, large readable fonts, and simple interactions. 
      */}
      <div className="max-w-4xl mx-auto">
        {/* Simple Header for Trust */}
        <header className="flex flex-col items-center justify-center text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">反诈护航员</h1>
          <p className="mt-4 text-xl sm:text-2xl text-gray-600 font-medium">永远保护您的财产安全</p>
        </header>

        {/* Main Interactive Component */}
        <DetectorUI />
        
        {/* Footer for extra reassurance */}
        <footer className="mt-16 text-center text-gray-500">
          <p className="text-lg">✅ 本地运行，完全免费，绝不泄露您的任何隐私。</p>
        </footer>
      </div>
    </main>
  );
}
