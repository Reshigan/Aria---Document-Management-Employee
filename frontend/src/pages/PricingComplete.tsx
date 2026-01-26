import React from 'react';
import { Check, X } from 'lucide-react';

const PricingComplete: React.FC = () => {
  const tiers = [
    {
      name: 'Free',
      price: 'R0',
      period: '/month',
      description: 'Perfect for trying out ARIA',
      features: [
        { text: '5 agents active', included: true },
        { text: '3 users', included: true },
        { text: '1 organization', included: true },
        { text: 'Community support', included: true },
        { text: 'Basic analytics', included: false },
        { text: 'API access', included: false },
        { text: 'Priority support', included: false },
      ],
      cta: 'Get Started Free',
      popular: false
    },
    {
      name: 'Starter',
      price: 'R499',
      period: '/month',
      description: 'For small businesses',
      features: [
        { text: '20 agents active', included: true },
        { text: '10 users', included: true },
        { text: '1 organization', included: true },
        { text: 'Email support (24h)', included: true },
        { text: 'Basic analytics', included: true },
        { text: 'API access', included: false },
        { text: 'Priority support', included: false },
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Professional',
      price: 'R1,999',
      period: '/month',
      description: 'For growing companies',
      features: [
        { text: '44 agents active', included: true },
        { text: '50 users', included: true },
        { text: '3 organizations', included: true },
        { text: 'Priority support (8h)', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'API access', included: true },
        { text: 'Custom workflows', included: true },
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'R4,999',
      period: '/month',
      description: 'For large organizations',
      features: [
        { text: 'All 59 agents active', included: true },
        { text: 'Unlimited users', included: true },
        { text: 'Unlimited organizations', included: true },
        { text: '24/7 support (1h response)', included: true },
        { text: 'Complete ERP suite', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'On-premise option', included: true },
      ],
      cta: 'Contact Sales',
      popular: false
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Choose the plan that fits your business needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 ${
                tier.popular ? 'ring-2 ring-blue-600 scale-105' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-lg rounded-tr-2xl text-sm font-semibold">
                  Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {tier.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{tier.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {tier.price}
                </span>
                <span className="text-gray-600 dark:text-gray-400">{tier.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    {feature.included ? (
                      <Check className="text-green-500 mr-2 flex-shrink-0 mt-0.5" size={20} />
                    ) : (
                      <X className="text-gray-400 mr-2 flex-shrink-0 mt-0.5" size={20} />
                    )}
                    <span className={`text-sm ${
                      feature.included ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                    }`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                tier.popular
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            All plans include 14-day free trial • No credit card required
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Need a custom plan? <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold">Contact our sales team</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingComplete;
