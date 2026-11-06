import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'MediVerify AI | Clinical Evidence Intelligence',description:'Trace every claim to its evidence. A self-correcting clinical research workspace with transparent verification.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
