import React from 'react';

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:'2rem', fontFamily:'system-ui, sans-serif', maxWidth:'860px', margin:'4rem auto'}}>
          <h1 style={{color:'#BE1E2D', fontSize:'1.5rem', marginBottom:'1rem'}}>Algo salio mal cargando la app</h1>
          <p style={{color:'#444'}}>Probá recargar (Ctrl+Shift+R o Cmd+Shift+R) o abrir en una ventana de incógnito.</p>
          <p style={{color:'#444', marginTop:'.5rem'}}>Si persiste, mostrá esta info al desarrollador:</p>
          <pre style={{background:'#f5f5f5', padding:'1rem', borderRadius:'8px', overflow:'auto', fontSize:'.85rem'}}>
{String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}
