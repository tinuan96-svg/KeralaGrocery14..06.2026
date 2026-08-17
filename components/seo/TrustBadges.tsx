'use client';

import { Shield, Truck, Lock, Award } from 'lucide-react';

export function TrustBadges() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
      <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-gray-200">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
          <Shield className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="font-semibold text-sm mb-1">Secure Checkout</h3>
        <p className="text-xs text-gray-600">Your payment is protected</p>
      </div>

      <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-gray-200">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
          <Truck className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="font-semibold text-sm mb-1">Fast UK Delivery</h3>
        <p className="text-xs text-gray-600">Next day available</p>
      </div>

      <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-gray-200">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-orange-600" />
        </div>
        <h3 className="font-semibold text-sm mb-1">Data Protection</h3>
        <p className="text-xs text-gray-600">Your info is safe</p>
      </div>

      <div className="flex flex-col items-center text-center p-4 bg-white rounded-lg border border-gray-200">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
          <Award className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="font-semibold text-sm mb-1">Trusted by Customers</h3>
        <p className="text-xs text-gray-600">Quality guaranteed</p>
      </div>
    </div>
  );
}

export function CheckoutTrustSignals() {
  return (
    <div className="space-y-3 mt-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900 text-sm">Secure Payment</p>
            <p className="text-xs text-green-700">Your payment is secure and encrypted</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-900 text-sm">Fast Delivery</p>
            <p className="text-xs text-blue-700">Next day delivery available across UK</p>
          </div>
        </div>
      </div>
    </div>
  );
}
