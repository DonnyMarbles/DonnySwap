import axios from 'axios';

const fetchKRESTPrice = async () => {
    try {
        const response = await axios.get('https://api.coinpaprika.com/v1/tickers/krest-krest-network');
        const krestData = response.data;
        if (krestData && krestData.quotes && krestData.quotes.USD) {
            return krestData.quotes.USD.price;
        }
        throw new Error('KREST price not found in response');
    } catch (error) {
        console.error('Error fetching KREST price:', error);
        return null;
    }
};

export default fetchKRESTPrice;