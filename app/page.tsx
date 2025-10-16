import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl w-full p-8 bg-white rounded-2xl shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-left">
            <div className="flex items-center mb-4">
              <div className="w-1.5 h-8 bg-blue-600 mr-3"></div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600">Admin Portal</h2>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Cloud Kitchen <br/>
              <span className="text-blue-600">Management System</span>
            </h1>
            <p className="text-lg mb-8 text-gray-600">
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/admin">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg font-medium rounded-lg">
                  Launch Dashboard
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg font-medium rounded-lg border-gray-300 text-gray-700">
                View Documentation
              </Button>
            </div>
          </div>
          <div className="relative w-full md:w-1/2 h-64 md:h-80">
            <div className="absolute top-4 right-4 bottom-4 left-4 bg-blue-50 rounded-xl"></div>
            <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <path d="M7 7h.01" />
                <path d="M11 7h.01" />
                <path d="M15 7h.01" />
                <path d="M4 11h16" />
                <path d="M12 12v6" />
                <path d="M8 16h8" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4">
            <p className="font-bold text-2xl text-gray-900">Real-time</p>
            <p className="text-gray-600">Order tracking</p>
          </div>
          <div className="p-4">
            <p className="font-bold text-2xl text-gray-900">Analytics</p>
            <p className="text-gray-600">Sales insights</p>
          </div>
          <div className="p-4">
            <p className="font-bold text-2xl text-gray-900">Multi-site</p>
            <p className="text-gray-600">Management</p>
          </div>
          <div className="p-4">
            <p className="font-bold text-2xl text-gray-900">Inventory</p>
            <p className="text-gray-600">Control system</p>
          </div>
        </div>
      </div>
    </div>
  )
}

