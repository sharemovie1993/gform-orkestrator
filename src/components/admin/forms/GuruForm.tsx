import React from 'react';
import { View } from 'react-native';
import { FormInput, FormSwitch } from '../AdminForm';

interface GuruFormProps {
  nama: string;
  onChangeNama: (text: string) => void;
  username: string;
  onChangeUsername: (text: string) => void;
  pin: string;
  onChangePin: (text: string) => void;
  isActive: boolean;
  onChangeIsActive: (val: boolean) => void;
  errors: Record<string, string>;
}

export function GuruForm({
  nama,
  onChangeNama,
  username,
  onChangeUsername,
  pin,
  onChangePin,
  isActive,
  onChangeIsActive,
  errors,
}: GuruFormProps) {
  return (
    <View style={{ gap: 6 }}>
      <FormInput
        label="Nama Lengkap Guru"
        value={nama}
        onChangeText={onChangeNama}
        placeholder="Contoh: Ani Wijaya, S.Pd."
        error={errors.nama}
      />
      <FormInput
        label="Username Login"
        value={username}
        onChangeText={onChangeUsername}
        placeholder="Contoh: aniwijaya"
        error={errors.username}
      />
      <FormInput
        label="PIN Pengawas (Buka Blokir HP Siswa)"
        value={pin}
        onChangeText={onChangePin}
        placeholder="Contoh: 1234 (minimal 4 digit)"
        keyboardType="numeric"
        secureTextEntry
        error={errors.pin}
      />
      <FormSwitch
        label="Status Aktif"
        value={isActive}
        onValueChange={onChangeIsActive}
      />
    </View>
  );
}
