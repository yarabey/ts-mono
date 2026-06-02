import styles from './Skeleton.module.css';

export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: number | string }) {
  return <span className={styles.skeleton} style={{ height, width }} aria-hidden />;
}

export function SkeletonCard() {
  return (
    <div className={styles.card} aria-busy>
      <Skeleton height={20} width="40%" />
      <Skeleton height={14} width="70%" />
      <Skeleton height={14} width="55%" />
    </div>
  );
}
