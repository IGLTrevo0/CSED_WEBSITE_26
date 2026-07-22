import React from 'react';
import Navbar from './components/layout/Navbar/Navbar';
import Footer from './components/layout/Footer/Footer';
import Home from './components/sections/Home/Home';
import About from './components/sections/About/About';
import Events from './components/sections/Events/Events';
import Blogs from './components/sections/Blogs/Blogs';
import Board from './components/sections/Board/Board';
import './App.css';

function App() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-white">
      <Navbar />
      <main className="flex-grow">
        <Home />
        <About />
        <Events />
        <Blogs />
        <Board />
      </main>
      <Footer />
    </div>
  );
}

export default App;
