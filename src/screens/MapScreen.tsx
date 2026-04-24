/**
 * Map Screen - Select destination location with OpenStreetMap
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Text, Platform, TouchableOpacity, StatusBar, TextInput, FlatList, ActivityIndicator, Keyboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTripStore } from '@store/useTripStore';
import { useLocationTracking } from '@hooks/useTracking';
import { Button } from '@components/UIComponents';
import { useTheme } from '@hooks/useTheme';
import { useAlert } from '../providers/AlertProvider';

// Lazy-loaded WebView for Native only
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {

  }
}
// Static Map HTML (defined outside component to prevent WebView remount loops)
const osmMapHtml = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
      <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"><\/script>
      <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; width: 100%; overflow: hidden; }
          #map { width: 100%; height: 100vh; }
          
          .pulse {
            display: block;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #007AFF;
            cursor: pointer;
            box-shadow: 0 0 0 rgba(0, 122, 255, 0.4);
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.4); }
            70% { box-shadow: 0 0 0 15px rgba(0, 122, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
          }

          .leaflet-routing-container {
            display: none !important;
          }
      </style>
  </head>
  <body>
      <div id="map"></div>
      <script>
          function sendToApp(data) {
              const message = JSON.stringify(data);
              if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(message);
              } else if (window.parent) {
                  window.parent.postMessage(message, '*');
              }
          }

          try {
              const map = L.map('map').setView([20.5937, 78.9629], 5);
              
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                  attribution: '© OpenStreetMap',
                  maxZoom: 19
              }).addTo(map);
              
              let currentMarker = null;
              let selectedMarker = null;
              let routingControl = null;
              
              function handleMessage(event) {
                  try {
                      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                      
                      if (data.type === 'setCenter') {
                          const { latitude, longitude, autoCenter, destination, waypointsArray, isViewOnly } = data;
                          if (isViewOnly) window.IS_VIEW_ONLY = true;
                          if (currentMarker) map.removeLayer(currentMarker);
                          
                          const pulseIcon = L.divIcon({
                            className: 'pulse-container',
                            html: '<div class="pulse"></div>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                          });

                          currentMarker = L.marker([latitude, longitude], {
                              icon: pulseIcon
                          }).addTo(map).bindPopup('Your Location');
                          
                          // Handle multiple waypoints for active trip routing
                          if (waypointsArray && waypointsArray.length > 0) {
                            const routePoints = [
                              L.latLng(latitude, longitude),
                              ...waypointsArray.map(wp => L.latLng(wp.latitude, wp.longitude))
                            ];

                            if (!routingControl) {
                              routingControl = L.Routing.control({
                                waypoints: routePoints,
                                lineOptions: {
                                  styles: [{ color: '#007AFF', weight: 6, opacity: 0.7 }]
                                },
                                createMarker: function(i, wp) {
                                  if (i === 0) return null; // No marker for user's start location
                                  const markerHtml = '<div style="background-color: #FF3333; color: white; width: 24px; height: 24px; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">' + i + '</div>';
                                  return L.marker(wp.latLng, {
                                    icon: L.divIcon({
                                      html: markerHtml,
                                      className: 'custom-div-icon',
                                      iconSize: [24, 24],
                                      iconAnchor: [12, 12]
                                    })
                                  }).bindPopup('Stop ' + i);
                                },
                                addWaypoints: false,
                                routeWhileDragging: false,
                                draggableWaypoints: false,
                                fitSelectedRoutes: autoCenter
                              }).addTo(map);
                            } else {
                              routingControl.setWaypoints(routePoints);
                            }
                          } 
                          // Fallback for single destination (e.g. previewing a location)
                          else if (destination) {
                            const routePoints = [
                              L.latLng(latitude, longitude),
                              L.latLng(destination.latitude, destination.longitude)
                            ];

                            if (!routingControl) {
                              routingControl = L.Routing.control({
                                waypoints: routePoints,
                                lineOptions: {
                                  styles: [{ color: '#007AFF', weight: 6, opacity: 0.7 }]
                                },
                                createMarker: function() { return null; },
                                addWaypoints: false,
                                routeWhileDragging: false,
                                draggableWaypoints: false,
                                fitSelectedRoutes: autoCenter
                              }).addTo(map);
                            } else {
                              routingControl.setWaypoints(routePoints);
                            }

                            if (selectedMarker) map.removeLayer(selectedMarker);
                            selectedMarker = L.marker([destination.latitude, destination.longitude], {
                                icon: L.icon({
                                    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cGF0aCBkPSJNMTYgMEM4LjggMCAyIDYuNCAyIDE0YzAgOCA4IDE4IDggMThzOC0xMCA4LTE4YzAtNy42LTYuNC0xNC0xNC0xNHoiIGZpbGw9IiNGRjMzMzMiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE0IiByPSI0IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
                                    iconSize: [32, 32],
                                    iconAnchor: [16, 32]
                                })
                            }).addTo(map).bindPopup('Destination');
                          }
                          
                          if (autoCenter && !destination && (!waypointsArray || waypointsArray.length === 0)) {
                            map.setView([latitude, longitude], 16);
                          }
                      } else if (data.type === 'dropMarker') {
                          const { latitude, longitude } = data;
                          
                          if (selectedMarker) map.removeLayer(selectedMarker);
                          
                          selectedMarker = L.marker([latitude, longitude], {
                              icon: L.icon({
                                  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cGF0aCBkPSJNMTYgMEM4LjggMCAyIDYuNCAyIDE0YzAgOCA4IDE4IDggMThzOC0xMCA4LTE4YzAtNy42LTYuNC0xNC0xNC0xNHoiIGZpbGw9IiNGRjMzMzMiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE0IiByPSI0IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
                                  iconSize: [32, 32],
                                  iconAnchor: [16, 32]
                              })
                          }).addTo(map).bindPopup('Destination');
                          
                          map.setView([latitude, longitude], 16);
                      }
                  } catch (e) {
                      console.error('Message handler error:', e);
                  }
              }

              window.addEventListener('message', handleMessage);
              document.addEventListener('message', handleMessage);
              
              map.on('click', (e) => {
                  if (window.IS_VIEW_ONLY) return;
                  const { lat, lng } = e.latlng;
                  
                  if (selectedMarker) map.removeLayer(selectedMarker);
                  
                  selectedMarker = L.marker([lat, lng], {
                      icon: L.icon({
                          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cGF0aCBkPSJNMTYgMEM4LjggMCAyIDYuNCAyIDE0YzAgOCA4IDE4IDggMThzOC0xMCA4LTE4YzAtNy42LTYuNC0xNC0xNC0xNHoiIGZpbGw9IiNGRjMzMzMiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE0IiByPSI0IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
                          iconSize: [32, 32],
                          iconAnchor: [16, 32]
                      })
                  }).addTo(map).bindPopup('Destination');
                  
                  sendToApp({
                      type: 'locationSelected',
                      latitude: lat,
                      longitude: lng
                  });
              });
              
              sendToApp({type: 'mapReady'});
          } catch (e) {
              console.error('Map error:', e);
          }
      <\/script>
  </body>
  </html>
`;

const MapScreen = ({ navigation, route }: any) => {
  const store = useTripStore();
  const isViewOnly = !!store.activeTrip;
  const { startTracking } = useLocationTracking();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const styles = getStyles(colors);

  // If opened from TripSetup via "Change Location", this holds the previously pinned coords
  const initialDestination = route?.params?.initialDestination || null;

  const [selectedLocation, setSelectedLocation] = useState<any>(initialDestination);
  const [isMapReady, setIsMapReady] = useState(false);
  // Start as true when we have an initial destination so we don't auto-center over it
  const [hasSetInitialLocation, setHasSetInitialLocation] = useState(!!initialDestination);
  const webViewRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isResolvingName, setIsResolvingName] = useState(false);

  /**
   * Reverse-geocode a coordinate and return the nearest town/city/suburb/village.
   * Uses Nominatim with zoom=10 (city level) — no extra distance check needed
   * since the API already constrains results to the local area.
   */
  const resolveNearbyPlaceName = async (
    latitude: number,
    longitude: number
  ): Promise<string | null> => {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=json` +
        `&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'WakeWayApp/1.0', Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.error) return null;

      // Walk the address hierarchy from most to least specific
      const addr = data.address || {};
      return (
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.municipality ||
        addr.county ||
        addr.state_district ||
        null
      );
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    Keyboard.dismiss();
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        {
          headers: {
            'User-Agent': 'WakeWayApp/1.0',
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      showAlert({
        title: 'Search Error', 
        message: 'Failed to fetch location results.'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    // Extract a clean short name instead of using the long display_name
    const addr = item.address || {};
    const shortName =
      item.name ||
      addr.city ||
      addr.town ||
      addr.village ||
      addr.suburb ||
      item.display_name.split(',')[0].trim();

    setSearchQuery(item.display_name);
    setSearchResults([]);
    Keyboard.dismiss();

    setSelectedLocation({ latitude: lat, longitude: lon, resolvedName: shortName });

    const message = JSON.stringify({
      type: 'dropMarker',
      latitude: lat,
      longitude: lon,
    });
    
    if (Platform.OS === 'web') {
      webViewRef.current?.contentWindow?.postMessage(message, '*');
    } else {
      webViewRef.current?.postMessage(message);
    }
  };

  // Start tracking location on mount to ensure we have currentLocation
  useEffect(() => {
    startTracking().catch(err => {
      console.error('Failed to start tracking in MapScreen:', err);
    });
  }, []);

  // Handle message from Map (Web & Native)
  const handleMapMessage = (data: any) => {
    try {
      if (data.type === 'locationSelected') {
        setSelectedLocation({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      } else if (data.type === 'mapReady') {
        setIsMapReady(true);
      }
    } catch (error) {
      console.error('Error handling map message:', error);
    }
  };

  // Center on User manually
  const handleCenterOnUser = () => {
    if (!store.currentLocation) {
      showAlert({
        title: 'Location Not Available',
        message: 'Fetching your location... Please ensure GPS and permissions are enabled.',
      });
      // Try restarting tracking
      startTracking();
      return;
    }

    const message = JSON.stringify({
      type: 'setCenter',
      latitude: store.currentLocation.latitude,
      longitude: store.currentLocation.longitude,
      autoCenter: true,
      waypointsArray: store.activeTrip?.waypoints?.map((w: any) => w.location),
      destination: store.activeTrip?.waypoints?.[store.activeTrip.currentWaypointIndex]?.location,
      isViewOnly: !!store.activeTrip,
    });
    
    if (Platform.OS === 'web') {
      webViewRef.current?.contentWindow?.postMessage(message, '*');
    } else {
      webViewRef.current?.postMessage(message);
    }
  };

  // Drop a marker at the previously-selected destination as soon as the map is ready
  useEffect(() => {
    if (isMapReady && initialDestination && !isViewOnly) {
      const message = JSON.stringify({
        type: 'dropMarker',
        latitude: initialDestination.latitude,
        longitude: initialDestination.longitude,
      });
      if (Platform.OS === 'web') {
        webViewRef.current?.contentWindow?.postMessage(message, '*');
      } else {
        webViewRef.current?.postMessage(message);
      }
    }
  }, [isMapReady]);

  // Live Location Updates — only auto-center on user if no prior destination was restored
  useEffect(() => {
    if (isMapReady && store.currentLocation) {
      const message = JSON.stringify({
        type: 'setCenter',
        latitude: store.currentLocation.latitude,
        longitude: store.currentLocation.longitude,
        autoCenter: !hasSetInitialLocation, // Only auto-center the first time
        waypointsArray: store.activeTrip?.waypoints?.map((w: any) => w.location),
        destination: store.activeTrip?.waypoints?.[store.activeTrip.currentWaypointIndex]?.location,
        isViewOnly: !!store.activeTrip,
      });
      
      if (Platform.OS === 'web') {
        webViewRef.current?.contentWindow?.postMessage(message, '*');
      } else {
        webViewRef.current?.postMessage(message);
      }

      if (!hasSetInitialLocation) {
        setHasSetInitialLocation(true);
      }
    }
  }, [isMapReady, store.currentLocation, store.activeTrip]);

  const handleNativeMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      handleMapMessage(data);
    } catch (error) {
      console.error('Error parsing native webview message:', error);
    }
  };

  // Web Messaging
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          handleMapMessage(data);
        } catch (e) {
          // Ignore non-JSON messages (like from other browser extensions)
        }
      };
      
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [store.currentLocation]);

  const handleSelectLocation = async () => {
    if (!selectedLocation) {
      showAlert({
        title: 'No Location', 
        message: 'Please tap on the map to select a destination.'
      });
      return;
    }

    // If we already have a resolved name from a search result, use it directly
    if (selectedLocation.resolvedName) {
      navigation.navigate('TripSetup', {
        destination: selectedLocation,
        destinationName: selectedLocation.resolvedName,
      });
      return;
    }

    // Otherwise attempt to reverse-geocode the pinned coordinate
    setIsResolvingName(true);
    const nearbyPlace = await resolveNearbyPlaceName(
      selectedLocation.latitude,
      selectedLocation.longitude
    );
    setIsResolvingName(false);

    navigation.navigate('TripSetup', {
      destination: selectedLocation,
      // Use resolved place name, or fall back to coordinates
      destinationName: nearbyPlace
        ? nearbyPlace
        : `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`,
    });
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{isViewOnly ? '📍 Trip Route' : '📍 Select Destination'}</Text>
        {isViewOnly ? (
           <Text style={styles.subtitle}>Currently navigating to your destination</Text>
        ) : (
          <>
            <Text style={styles.subtitle}>Tap on the map or search to select a location</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search location..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={(text) => {
                   setSearchQuery(text);
                   if (text === '') setSearchResults([]);
                }}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchButton}>
                {isSearching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="search" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={styles.mapContainer}>
        {searchResults.length > 0 && (
          <View style={[styles.searchResultsContainer, { backgroundColor: colors.surface }]}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.place_id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <Text style={[styles.searchResultText, { color: colors.text }]} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}
        {Platform.OS === 'web' ? (
          <iframe
            ref={webViewRef}
            srcDoc={osmMapHtml}
            style={{ border: 'none', width: '100%', height: '100%' }}
            title="Map View"
          />
        ) : (
          WebView ? (
            <WebView
              ref={webViewRef}
              source={{ html: osmMapHtml }}
              style={styles.map}
              onMessage={handleNativeMessage}
              javaScriptEnabled={true}
              scalesPageToFit={true}
              scrollEnabled={true}
              bounces={false}
              startInLoadingState={true}
              mixedContentMode="always"
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Map module failed to load. Please restart the app.</Text>
            </View>
          )
        )}

        {/* Locate Me Button */}
        <TouchableOpacity
          style={styles.locateButton}
          onPress={handleCenterOnUser}
          activeOpacity={0.8}
        >
          <MaterialIcons name="my-location" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
        {isViewOnly ? (
          <Button
            title="Back to Home"
            onPress={() => navigation.goBack()}
            style={styles.button}
            variant="outline"
          />
        ) : (
          <>
            {!isKeyboardVisible && (
              <Text style={styles.instruction}>
                {isResolvingName
                  ? '🔍 Resolving nearby place...'
                  : selectedLocation
                  ? `✓ Selected: ${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`
                  : '📍 Tap map to select'}
              </Text>
            )}
            <Button
              title={isKeyboardVisible ? "Search" : isResolvingName ? "Resolving..." : "Confirm Location"}
              onPress={isKeyboardVisible ? handleSearchSubmit : handleSelectLocation}
              style={styles.button}
              loading={isResolvingName}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: colors.primary,
    height: 40,
    width: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    maxHeight: 200,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchResultText: {
    fontSize: 14,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  locateButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: colors.surface,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24, // Extra padding for safe area
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  instruction: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    width: '100%',
  },
});

export default MapScreen;
