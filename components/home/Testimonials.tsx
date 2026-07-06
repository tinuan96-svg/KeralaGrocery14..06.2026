'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote, Users, Heart } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const testimonials = [
  {
    id: 1,
    name: 'Priya Nair',
    location: 'London',
    rating: 5,
    text: 'Finally found authentic Kerala products in the UK! The quality is amazing and delivery is super fast. Feels like shopping back home.',
    initials: 'PN',
  },
  {
    id: 2,
    name: 'Rajesh Kumar',
    location: 'Manchester',
    rating: 5,
    text: 'Best Kerala grocery store online. Fresh spices, great prices, and excellent customer service. Highly recommended!',
    initials: 'RK',
  },
  {
    id: 3,
    name: 'Anita Thomas',
    location: 'Birmingham',
    rating: 5,
    text: 'Love the wide selection of products. Everything from rice to snacks, all authentic. My go-to store for Kerala groceries.',
    initials: 'AT',
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-green-200/20 rounded-full blur-3xl -translate-y-1/2 -z-0" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl -translate-y-1/2 -z-0" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-xl">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
            Loved by the Kerala Community
          </h2>
          <p className="text-gray-600 text-lg font-medium max-w-2xl mx-auto mb-8">
            Join thousands of happy customers who trust us for authentic Kerala groceries delivered across the UK
          </p>
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-50 to-orange-50 px-8 py-4 rounded-2xl shadow-lg border-2 border-green-100">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="font-extrabold text-2xl text-gray-900">4.9/5</span>
            <span className="text-gray-600 font-semibold">from 1,000+ reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.id}
              className="relative hover-lift glass-card border-2 border-green-100 overflow-hidden group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/10 to-orange-400/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-8 relative z-10">
                <div className="mb-6">
                  <Quote className="h-12 w-12 text-green-600/30" />
                </div>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-8 leading-relaxed text-base font-medium">
                  &quot;{testimonial.text}&quot;
                </p>
                <div className="flex items-center gap-4 pt-6 border-t-2 border-green-100">
                  <Avatar className="w-14 h-14 border-2 border-green-200">
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-lg">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{testimonial.name}</p>
                    <p className="text-sm text-gray-600 font-medium">{testimonial.location}, UK</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-600 text-lg font-medium flex items-center justify-center gap-2">
            Made with <Heart className="h-5 w-5 fill-red-500 text-red-500 inline animate-pulse" /> for the Kerala community in the UK
          </p>
        </div>
      </div>
    </section>
  );
}
