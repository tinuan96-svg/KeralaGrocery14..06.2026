import { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Calendar, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog - Kerala Groceries UK | Indian Food & Cooking Tips',
  description: 'Read our blog for Kerala recipes, Indian cooking tips, product guides, and more. Learn about authentic Kerala groceries and how to use them.',
};

const blogPosts = [
  {
    slug: 'top-10-kerala-foods-uk',
    title: 'Top 10 Kerala Foods You Can Buy in the UK',
    excerpt: 'Discover the most popular Kerala foods available online in the UK. From traditional snacks to essential cooking ingredients, we cover everything you need.',
    date: '2026-04-01',
    category: 'Product Guides',
    readTime: '5 min read',
  },
  {
    slug: 'where-to-buy-curry-leaves-uk',
    title: 'Where to Buy Fresh Curry Leaves in the UK',
    excerpt: 'Fresh curry leaves are essential for authentic Kerala cooking. Learn where to find them and how to store them for maximum freshness.',
    date: '2026-03-28',
    category: 'Ingredients Guide',
    readTime: '4 min read',
  },
  {
    slug: 'best-indian-grocery-delivery-london',
    title: 'Best Indian Grocery Delivery in London - Complete Guide',
    excerpt: 'Looking for Indian grocery delivery in London? We compare the best options and show you how to get authentic Kerala groceries delivered to your door.',
    date: '2026-03-25',
    category: 'Buying Guides',
    readTime: '6 min read',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Kerala Groceries Blog</h1>
          <p className="text-xl opacity-90 max-w-2xl">
            Your guide to Kerala groceries, Indian cooking, and authentic recipes
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="h-full hover:shadow-lg transition-shadow p-6 bg-white">
                <div className="mb-4">
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                    {post.category}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                  {post.title}
                </h2>
                <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <span>{post.readTime}</span>
                </div>
                <div className="mt-4 flex items-center text-green-600 font-semibold">
                  Read more <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
