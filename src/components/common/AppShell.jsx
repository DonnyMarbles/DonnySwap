import { useEffect } from 'react';
import PropTypes from 'prop-types';

const AppShell = ({ backgroundImage, children }) => {
  useEffect(() => {
    const root = document.documentElement;
    if (backgroundImage) {
      root.style.setProperty('--app-bg-image', `url(${backgroundImage})`);
    } else {
      root.style.removeProperty('--app-bg-image');
    }
    return () => {
      root.style.removeProperty('--app-bg-image');
    };
  }, [backgroundImage]);

  return (
    <div className="app-shell">
      <div className="app-shell__content">
        {children}
      </div>
    </div>
  );
};

AppShell.propTypes = {
  backgroundImage: PropTypes.string,
  children: PropTypes.node.isRequired,
};

AppShell.defaultProps = {
  backgroundImage: null,
};

export default AppShell;

