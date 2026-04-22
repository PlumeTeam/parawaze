'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string | null;
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('[ParaWaze] MapView crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm mx-4 text-center">
            <div className="text-4xl mb-3">🗺️</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Carte indisponible</h2>
            <p className="text-sm text-gray-500 mb-4">
              La carte n&apos;a pas pu se charger. Fermez d&apos;autres applications et réessayez.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-sky-500 text-white px-5 py-2 rounded-full text-sm font-medium"
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
