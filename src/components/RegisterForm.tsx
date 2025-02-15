import { useState } from 'react';
// import { useHistory } from 'react-router-dom';

const RegisterForm = () => {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
//   const history = useHistory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!fullname || !email || !password) {
      setError('Fullname, email, and password are required.');
      setLoading(false);
      return;
    }

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullname, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Handle successful registration (e.g., redirect or show a success message)
      console.log('Registration successful:', data);
    //   history.push('/login');
    } else {
      setError(data.message || 'Registration failed. Please try again.');
    }

    setLoading(false);
  };

  const handleLogin = () => {
    // history.push('/login');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
      <div>
        <label htmlFor="fullname" className="block text-sm font-medium text-gray-700">
          Fullname
        </label>
        <input
          type="text"
          id="fullname"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
          required
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50"
          required
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={loading}
      >
        {loading ? 'Registering...' : 'Register'}
      </button>
      <button
        type="button"
        onClick={handleLogin}
        className="w-full py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700"
      >
        Existing User? Login
      </button>
    </form>
  );
};

export default RegisterForm;