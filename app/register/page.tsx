import RegistrationForm from "@/components/RegistrationForm";

export const metadata = {
  title: "Register Your Child - BEKA Bus Portal",
  description: "Register your child for BEKA Academy's student transit system",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Register Your Children
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Complete this form to register your children for BEKA Academy's
            student transit system. You'll receive a reference code to track
            your registration.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-10">
          <RegistrationForm />
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Already registered?{" "}
            <a href="/" className="text-purple-600 hover:text-purple-700 font-medium">
              Check your status
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

