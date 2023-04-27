import { useId, useRef } from 'react'
import { Button } from '@/components/Button'

export function SignUpForm() {
  const id = useId();
  const inputEl = useRef(null);
  const subscribe = async (e) => {
    e.preventDefault();
 
    // 3. Send a request to our API with the user's email address.
    const res = await fetch('/api/subscribe', {
      body: JSON.stringify({
        email: inputEl.current.value,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
 
    const { error } = await res.json();
 
    if (error) {
      alert(error);
      return;
    }
 
    // 5. Clear the input value and show a success message.
    inputEl.current.value = '';
    alert( 'Success! 🎉 You are now subscribed to the newsletter.' );
  };
  return (
    <form className="relative isolate mt-8 flex items-center pr-1" onSubmit={subscribe} >
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <input
        required
        type="email"
        autoComplete="email"
        name="email"
        ref={inputEl}
        id={id}
        placeholder="Email address"
        className="peer w-0 flex-auto bg-transparent px-4 py-2.5 text-base text-white placeholder:text-gray-500 focus:outline-none sm:text-[0.8125rem]/6"
      />
      <Button type="submit" arrow >
        Get updates
      </Button>
      <div className="absolute inset-0 -z-10 rounded-lg transition peer-focus:ring-4 peer-focus:ring-sky-300/15" />
      <div className="absolute inset-0 -z-10 rounded-lg bg-white/2.5 ring-1 ring-white/15 transition peer-focus:ring-sky-300" />
    </form>
  )
}
