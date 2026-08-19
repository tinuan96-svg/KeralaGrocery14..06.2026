export const dynamicParams = false;
export async function generateStaticParams() {
  return [{ slug: 'test' }];
}
export default function TestPage() {
  return <div>Test</div>;
}
