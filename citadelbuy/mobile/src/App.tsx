import React from 'react';
import { StatusBar, SafeAreaView, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store } from './store';
import RootNavigator from './navigation/RootNavigator';
import { ThemeProvider } from './theme/ThemeContext';

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <ThemeProvider>
          <NavigationContainer>
            <SafeAreaView style={styles.container}>
              <StatusBar barStyle="dark-content" />
              <RootNavigator />
            </SafeAreaView>
          </NavigationContainer>
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
