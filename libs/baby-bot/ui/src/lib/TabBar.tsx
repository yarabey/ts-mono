import styles from './TabBar.module.css';

export interface TabItem {
  id: string;
  label: string;
  icon: string;
}

export interface TabBarProps {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

export function TabBar({ items, active, onChange }: TabBarProps) {
  return (
    <nav className={styles.bar}>
      {items.map((item) => (
        <button
          key={item.id}
          className={`${styles.tab} ${item.id === active ? styles.active : ''}`}
          onClick={() => onChange(item.id)}
          aria-current={item.id === active}
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
