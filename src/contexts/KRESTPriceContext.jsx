import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';

export const KRESTPriceContext = createContext();

export const KRESTPriceProvider = ({ children }) => {
  const [krestPrice, setKrestPrice] = useState(0); // Default value for KREST price

  const fetchKRESTPrice = async () => {
    try {
      const response = await axios.get('https://api.coinpaprika.com/v1/tickers/krest-krest-network'); // Replace with actual CoinPaprika API endpoint
      const price = response.data.quotes.USD.price;
      console.log('Fetched KREST price:', price);
      setKrestPrice(price);
    } catch (error) {
      console.error('Error fetching KREST price:', error);
    }
  };

  useEffect(() => {
    fetchKRESTPrice();
  }, []);

  return (
    <KRESTPriceContext.Provider value={{ krestPrice }}>
      {children}
    </KRESTPriceContext.Provider>
  );
};
