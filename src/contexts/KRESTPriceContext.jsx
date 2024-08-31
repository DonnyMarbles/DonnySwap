import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';

export const KRESTPriceContext = createContext();

export const KRESTPriceProvider = ({ children }) => {
  const [krestPrice, setKrestPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchKRESTPrice = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://api.coinpaprika.com/v1/tickers/krest-krest-network'); // Replace with actual CoinPaprika API endpoint
      const price = response.data.quotes.USD.price;
      console.log('Fetched KREST price:', price);
      setKrestPrice(price);
      setLoading(false);
      setError(false);
    } catch (error) {
      console.error('Error fetching KREST price:', error);
      setLoading(false);
      setError(true);
    }
  };

  useEffect(() => {
    fetchKRESTPrice(); // Fetch price initially

    // Set an interval to refresh price every 5 minutes (300000 ms)
    const interval = setInterval(fetchKRESTPrice, 12000);

    return () => clearInterval(interval); // Clean up the interval on component unmount
  }, []);

  return (
    <KRESTPriceContext.Provider value={{ krestPrice, loading, error }}>
      {children}
    </KRESTPriceContext.Provider>
  );
};
