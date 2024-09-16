// import { EntitySchema } from 'typeorm';

// const ClientSchema = new EntitySchema({
//     name: 'Client',
//     tableName: 'clients',
//     columns: {
//         id: {
//             primary: true,
//             type: 'uuid',
//             generated: 'uuid',
//         },
//         name: {
//             type: 'varchar',
//             unique: true,
//         },
//         status: {
//             type: 'varchar',
//             default: 'offline',
//         },
//         location: {
//             type: 'varchar',
//             nullable: true,
//         },
//         last_seen: {
//             type: 'timestamp',
//             nullable: true,
//         },
//         created_at: {
//             type: 'timestamp',
//             createDate: true,
//         },
//     },
// });

// export default ClientSchema;


import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id;

  @Column()
  name;

  @Column({ default: 'offline' })
  status;

  @Column({ nullable: true })
  location;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_seen;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at;
}
