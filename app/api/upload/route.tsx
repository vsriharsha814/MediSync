export async function POST(req) {
    const body = await req.json(); // Assuming the file is sent in the body
  
    // Process the file (e.g., save it to a directory, database, etc.)
    // This is a placeholder for actual file processing logic
  
    return new Response(JSON.stringify({ message: 'File uploaded successfully', file: body }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  export async function OPTIONS() {
    return new Response(null, {
      status: 204,
      headers: {
        'Allow': 'POST, OPTIONS',
      },
    });
  }