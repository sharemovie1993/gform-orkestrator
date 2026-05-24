import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';

interface DateTimePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (dateStr: string, timeStr: string) => void;
  currentDate: string; // Format: YYYY-MM-DD
  currentTime: string; // Format: HH:mm
}

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const WEEKDAYS_ID = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'];

export function DateTimePicker({
  visible,
  onClose,
  onConfirm,
  currentDate,
  currentTime,
}: DateTimePickerProps) {
  // Parse initial date
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(4); // 0-indexed (Mei = 4)
  const [selectedDay, setSelectedDay] = useState(24);

  // Time state
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(0);

  // Sync state with props when modal opens
  useEffect(() => {
    if (visible) {
      try {
        const dateParts = (currentDate || '').split('-');
        if (dateParts.length === 3) {
          const y = parseInt(dateParts[0], 10);
          const m = parseInt(dateParts[1], 10) - 1; // 0-indexed
          const d = parseInt(dateParts[2], 10);
          setViewYear(y);
          setViewMonth(m);
          setSelectedDay(d);
        }
      } catch (err) {}

      try {
        const timeParts = (currentTime || '').split(':');
        if (timeParts.length >= 2) {
          setSelectedHour(parseInt(timeParts[0], 10));
          setSelectedMinute(parseInt(timeParts[1], 10));
        }
      } catch (err) {}
    }
  }, [visible, currentDate, currentTime]);

  // Calendar calculations
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    const day = new Date(year, month, 1).getDay();
    // Adjust so Monday is 0, Sunday is 6
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayIndex = getFirstDayOfWeek(viewYear, viewMonth);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
  };

  const handleConfirmPress = () => {
    const pad = (num: number) => String(num).padStart(2, '0');
    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(selectedDay)}`;
    const timeStr = `${pad(selectedHour)}:${pad(selectedMinute)}`;
    onConfirm(dateStr, timeStr);
  };

  // Generate calendar days
  const renderCalendarCells = () => {
    const cells = [];
    const totalCells = firstDayIndex + daysInMonth;
    const rows = Math.ceil(totalCells / 7);

    for (let i = 0; i < rows * 7; i++) {
      const dayNum = i - firstDayIndex + 1;
      const isValidDay = dayNum > 0 && dayNum <= daysInMonth;

      if (isValidDay) {
        const isSelected = selectedDay === dayNum;
        cells.push(
          <TouchableOpacity
            key={`day-${dayNum}`}
            style={[styles.dayCell, isSelected && styles.dayCellActive]}
            onPress={() => handleDaySelect(dayNum)}
          >
            <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
              {dayNum}
            </Text>
          </TouchableOpacity>
        );
      } else {
        cells.push(<View key={`empty-${i}`} style={styles.dayCellEmpty} />);
      }
    }
    return cells;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>📅 Pilih Tanggal & Waktu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollBody}>
            {/* 1. CALENDAR SECTION */}
            <View style={styles.sectionContainer}>
              {/* Calendar Month Navigation */}
              <View style={styles.navRow}>
                <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
                  <Text style={styles.navBtnText}>◀</Text>
                </TouchableOpacity>
                <Text style={styles.navTitle}>
                  {MONTHS_ID[viewMonth]} {viewYear}
                </Text>
                <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
                  <Text style={styles.navBtnText}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* Weekday labels */}
              <View style={styles.weekHeader}>
                {WEEKDAYS_ID.map((day, idx) => (
                  <View key={`week-${idx}`} style={styles.weekLabelContainer}>
                    <Text style={styles.weekLabel}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>{renderCalendarCells()}</View>
            </View>

            {/* 2. TIME PICKER SECTION */}
            <View style={[styles.sectionContainer, styles.timeSection]}>
              <Text style={styles.sectionLabel}>🕒 WAKTU UJIAN</Text>
              
              <View style={styles.timeSelectRow}>
                {/* Hour selection */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnLabel}>Jam</Text>
                  <ScrollView nestedScrollEnabled style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 24 }, (_, i) => i).map((h) => {
                      const isActive = selectedHour === h;
                      return (
                        <TouchableOpacity
                          key={`hr-${h}`}
                          style={[styles.timeBtn, isActive && styles.timeBtnActive]}
                          onPress={() => setSelectedHour(h)}
                        >
                          <Text style={[styles.timeBtnTxt, isActive && styles.timeBtnTxtActive]}>
                            {String(h).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <Text style={styles.timeSeparator}>:</Text>

                {/* Minute selection */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnLabel}>Menit</Text>
                  <ScrollView nestedScrollEnabled style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                      const isActive = selectedMinute === m;
                      return (
                        <TouchableOpacity
                          key={`min-${m}`}
                          style={[styles.timeBtn, isActive && styles.timeBtnActive]}
                          onPress={() => setSelectedMinute(m)}
                        >
                          <Text style={[styles.timeBtnTxt, isActive && styles.timeBtnTxtActive]}>
                            {String(m).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmPress}>
              <Text style={styles.confirmBtnText}>Pilih & Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#1E293B',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollBody: {
    padding: 16,
  },
  sectionContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#263347',
    marginBottom: 16,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700',
  },
  navTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekLabelContainer: {
    width: '13%',
    alignItems: 'center',
  },
  weekLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: '13%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  dayCellActive: {
    backgroundColor: '#3B82F6',
  },
  dayCellEmpty: {
    width: '13%',
    height: 36,
  },
  dayText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  dayTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  timeSection: {
    padding: 12,
    alignItems: 'center',
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  timeSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 8,
  },
  timeColumn: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 80,
  },
  timeColumnLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  timeScroll: {
    height: 100,
    width: '100%',
    borderWidth: 1,
    borderColor: '#263347',
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  timeBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  timeBtnTxt: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  timeBtnTxtActive: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '800',
  },
  timeSeparator: {
    color: '#3B82F6',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    backgroundColor: '#1E293B',
    gap: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
