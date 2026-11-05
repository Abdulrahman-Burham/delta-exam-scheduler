import type { Metadata } from 'next';
import '../index.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'نظام إدارة وجدولة المراقبات الامتحانية — كلية الذكاء الاصطناعي (جامعة الدلتا)',
  description: 'النظام الآلي لإدارة وتوزيع جداول المراقبات ولجان الامتحانات بكلية الذكاء الاصطناعي',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-white min-h-screen flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
