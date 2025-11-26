import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressApi } from '../../services/api';

interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  isDefault: boolean;
  type: 'home' | 'work' | 'other';
}

const mockAddresses: Address[] = [
  { id: '1', name: 'John Doe', street: '123 Main Street, Apt 4B', city: 'New York', state: 'NY', zip: '10001', country: 'United States', phone: '+1 234 567 8900', isDefault: true, type: 'home' },
  { id: '2', name: 'John Doe', street: '456 Corporate Ave, Suite 200', city: 'New York', state: 'NY', zip: '10002', country: 'United States', phone: '+1 234 567 8901', isDefault: false, type: 'work' },
];

const typeConfig = {
  home: { icon: 'home-outline', label: 'Home', color: '#6366f1' },
  work: { icon: 'briefcase-outline', label: 'Work', color: '#f59e0b' },
  other: { icon: 'location-outline', label: 'Other', color: '#10b981' },
};

export default function AddressesScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressApi.getAddresses(),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => addressApi.deleteAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => addressApi.setDefault(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });

  const addressList = addresses?.data || mockAddresses;

  const handleDelete = (address: Address) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteAddressMutation.mutate(address.id) },
      ]
    );
  };

  const handleSetDefault = (address: Address) => {
    if (!address.isDefault) {
      setDefaultMutation.mutate(address.id);
    }
  };

  const renderAddress = ({ item }: { item: Address }) => {
    const typeInfo = typeConfig[item.type];

    return (
      <View style={[styles.addressCard, item.isDefault && styles.addressCardDefault]}>
        <View style={styles.addressHeader}>
          <View style={styles.typeContainer}>
            <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + '20' }]}>
              <Ionicons name={typeInfo.icon as any} size={18} color={typeInfo.color} />
            </View>
            <Text style={styles.typeName}>{typeInfo.label}</Text>
          </View>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>

        <View style={styles.addressContent}>
          <Text style={styles.addressName}>{item.name}</Text>
          <Text style={styles.addressText}>{item.street}</Text>
          <Text style={styles.addressText}>{item.city}, {item.state} {item.zip}</Text>
          <Text style={styles.addressText}>{item.country}</Text>
          <Text style={styles.phoneText}>{item.phone}</Text>
        </View>

        <View style={styles.addressActions}>
          {!item.isDefault && (
            <TouchableOpacity
              style={styles.setDefaultButton}
              onPress={() => handleSetDefault(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#6366f1" />
              <Text style={styles.setDefaultText}>Set as Default</Text>
            </TouchableOpacity>
          )}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setEditingAddress(item);
                setModalVisible(true);
              }}
            >
              <Ionicons name="pencil-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={addressList}
        renderItem={renderAddress}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="location-outline" size={64} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>No addresses saved</Text>
            <Text style={styles.emptyText}>Add an address to make checkout faster</Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingAddress(null);
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add New Address</Text>
      </TouchableOpacity>

      <AddressModal
        visible={modalVisible}
        address={editingAddress}
        onClose={() => {
          setModalVisible(false);
          setEditingAddress(null);
        }}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['addresses'] });
          setModalVisible(false);
          setEditingAddress(null);
        }}
      />
    </View>
  );
}

function AddressModal({
  visible,
  address,
  onClose,
  onSave,
}: {
  visible: boolean;
  address: Address | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(address?.name || '');
  const [street, setStreet] = useState(address?.street || '');
  const [city, setCity] = useState(address?.city || '');
  const [state, setState] = useState(address?.state || '');
  const [zip, setZip] = useState(address?.zip || '');
  const [phone, setPhone] = useState(address?.phone || '');
  const [type, setType] = useState<'home' | 'work' | 'other'>(address?.type || 'home');

  const handleSave = () => {
    if (!name || !street || !city || !state || !zip || !phone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    onSave();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {address ? 'Edit Address' : 'Add Address'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.inputLabel}>Address Type</Text>
          <View style={styles.typeSelector}>
            {(['home', 'work', 'other'] as const).map((t) => {
              const info = typeConfig[t];
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeOption, type === t && styles.typeOptionSelected]}
                  onPress={() => setType(t)}
                >
                  <Ionicons name={info.icon as any} size={20} color={type === t ? '#fff' : info.color} />
                  <Text style={[styles.typeOptionText, type === t && styles.typeOptionTextSelected]}>
                    {info.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter full name"
          />

          <Text style={styles.inputLabel}>Street Address</Text>
          <TextInput
            style={styles.input}
            value={street}
            onChangeText={setStreet}
            placeholder="Enter street address"
          />

          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="City"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={styles.input}
                value={state}
                onChangeText={setState}
                placeholder="State"
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>ZIP Code</Text>
          <TextInput
            style={styles.input}
            value={zip}
            onChangeText={setZip}
            placeholder="Enter ZIP code"
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  addressCardDefault: {
    borderColor: '#6366f1',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  defaultBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  addressContent: {
    marginBottom: 12,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  phoneText: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  setDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setDefaultText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  saveText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 8,
  },
  typeOptionSelected: {
    backgroundColor: '#6366f1',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
});
