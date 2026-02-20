import db from '@/utils/db';

export async function DELETE() {
  try {
    // Delete all transactions
    db.prepare('DELETE FROM transactions').run();
    
    // Delete all budgets
    db.prepare('DELETE FROM budgets').run();
    
    return Response.json({
      success: true,
      message: 'All data deleted successfully'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
