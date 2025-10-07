import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChefHat, Users, ClipboardList, TrendingUp } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16 pt-8">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-amber-600 to-orange-600 p-6 rounded-full shadow-2xl">
              <ChefHat className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4 tracking-tight">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">Bhojanalay</span>
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto mb-2 leading-relaxed">
            Your complete restaurant management solution
          </p>
          <p className="text-lg text-gray-600 max-w-xl mx-auto mb-12">
            Streamline operations, manage orders, and delight your customers
          </p>

          <Link href="/admin">
            <Button size="lg" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              Access Kitchen Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-20">
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-amber-100">
            <div className="bg-amber-100 w-14 h-14 rounded-full flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-amber-700" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">User Management</h3>
            <p className="text-gray-600 leading-relaxed">
              Manage staff accounts, assign roles, and control access with ease
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-100">
            <div className="bg-orange-100 w-14 h-14 rounded-full flex items-center justify-center mb-4">
              <ClipboardList className="w-7 h-7 text-orange-700" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Menu Control</h3>
            <p className="text-gray-600 leading-relaxed">
              Update your menu, manage pricing, and track item availability
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-red-100">
            <div className="bg-red-100 w-14 h-14 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="w-7 h-7 text-red-700" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Order Tracking</h3>
            <p className="text-gray-600 leading-relaxed">
              Monitor orders in real-time and ensure smooth kitchen operations
            </p>
          </div>
        </div>

        <div className="text-center mt-20 pb-8">
          <p className="text-gray-500 text-sm">
            Trusted by restaurants to manage their daily operations efficiently
          </p>
        </div>
      </div>
    </div>
  )
}

