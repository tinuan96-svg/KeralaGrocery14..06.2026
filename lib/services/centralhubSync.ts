/**
 * CentralHub Manual Sync Client
 */

export async function triggerFullSync() {
  const CENTRALHUB_SYNC_URL = process.env.NEXT_PUBLIC_CENTRALHUB_SYNC_URL || 'https://centralhub-network.netlify.app/api/products/sync';

  try {
    console.log('Triggering full sync from CentralHub...');

    const response = await fetch(CENTRALHUB_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ syncAll: true }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sync trigger failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Sync trigger successful:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error triggering CentralHub sync:', error.message);
    return { success: false, error: error.message };
  }
}
