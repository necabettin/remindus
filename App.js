import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, AppState, View, ActivityIndicator } from 'react-native';
import PaymentListScreen from './src/screens/PaymentListScreen';
import AddEditPaymentScreen from './src/screens/AddEditPaymentScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { registerForNotifications, scheduleAllReminders } from './src/utils/notifications';
import { getAllPayments } from './src/utils/storage';
import { initI18n } from './src/i18n/i18n';

const Stack = createStackNavigator();

export default function App() {
  const appState = useRef(AppState.currentState);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initI18n();
      setI18nReady(true);
      registerForNotifications();
    };
    init();

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        const all = await getAllPayments();
        const unpaid = all.filter((p) => !p.isPaid);
        await scheduleAllReminders(unpaid);
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  if (!i18nReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#C0392B" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#F8F9FA' },
          }}
        >
          <Stack.Screen name="PaymentList" component={PaymentListScreen} />
          <Stack.Screen
            name="AddEdit"
            component={AddEditPaymentScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ presentation: 'modal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});
