'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class MapErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ParaWaze] MapView crash:', error.message, info.componentStack?.slice(0, 200));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-8">
          <div className="text-center max-w-xs">
            <div className="text-5xl mb-4">🗺️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              La carte n&apos;a pas pu se charger
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Votre appareil manque peut-être de mémoire. Fermez d&apos;autres apps et réessayez.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-5 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold shadow"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
