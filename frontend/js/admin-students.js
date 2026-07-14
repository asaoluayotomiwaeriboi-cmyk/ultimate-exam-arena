let allStudents = [];
let currentPage = 1;
const studentsPerPage = 20;

async function loadStudents() {
  try {
    const response = await fetch('/api/admin/students');
    const data = await response.json();

    if (data.success) {
      allStudents = data.students;
      displayStudents(allStudents);
    }
  } catch (error) {
    console.error('Error loading students:', error);
    document.getElementById('students-tbody').innerHTML =
      '<tr><td colspan="10" style="text-align: center; color: red;">Error loading students</td></tr>';
  }
}

function displayStudents(students) {
  const tbody = document.getElementById('students-tbody');

  if (students.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No students found</td></tr>';
    return;
  }
  const start = (currentPage - 1) * studentsPerPage;
  const end = start + studentsPerPage;
  const paginatedStudents = students.slice(start, end);

  tbody.innerHTML = '';
  paginatedStudents.forEach((student) => {
    const tr = document.createElement('tr');
    const cells = [
      (() => {
        const td = document.createElement('td');
        const b = document.createElement('strong');
        b.textContent = student.name;
        td.appendChild(b);
        return td;
      })(),
      (() => {
        const td = document.createElement('td');
        td.textContent = student.email;
        return td;
      })(),
      (() => {
        const td = document.createElement('td');
        td.textContent = student.phone || '-';
        return td;
      })(),
      (() => {
        const td = document.createElement('td');
        td.textContent = student.state || '-';
        return td;
      })(),
      (() => {
        const td = document.createElement('td');
        td.textContent = student.school || '-';
        return td;
      })(),
      (() => {
        const td = document.createElement('td');
        td.textContent = student.targetCourse || '-';
        return td;
      })(),
      (() => {
        const td = document.createElement('td');
        td.textContent = new Date(student.createdAt).toLocaleDateString();
        return td;
      })(),
      (() => {
        const td = document.createElement('td');
        td.textContent = student.lastLogin
          ? new Date(student.lastLogin).toLocaleDateString()
          : 'Never';
        return td;
      })(),
      (() => {
        const td = document.createElement('td');
        td.innerHTML = '<span class="badge-small badge-active">Active</span>';
        return td;
      })(),
      (() => {
        const td = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.textContent = 'View';
        btn.addEventListener('click', () => viewStudentProfile(student.id));
        td.appendChild(btn);
        return td;
      })(),
    ];
    cells.forEach((c) => tr.appendChild(c));
    tbody.appendChild(tr);
  });

  // Create pagination
  const totalPages = Math.ceil(students.length / studentsPerPage);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = i === currentPage ? 'btn btn-primary' : 'btn btn-secondary';
    btn.onclick = () => {
      currentPage = i;
      displayStudents(students);
    };
    pagination.appendChild(btn);
  }
}

function viewStudentProfile(studentId) {
  const student = allStudents.find((s) => s.id === studentId);
  if (student) {
    alert(
      `${student.name}\n${student.email}\n${student.phone}\n${student.state}, ${student.lga}\n${student.school}\nTarget: ${student.targetCourse}`
    );
  }
}

document.getElementById('search-btn').addEventListener('click', () => {
  const name = document.getElementById('search-name').value.toLowerCase();
  const email = document.getElementById('search-email').value.toLowerCase();
  const state = document.getElementById('filter-state').value;

  const filtered = allStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(name) &&
      student.email.toLowerCase().includes(email) &&
      (!state || student.state === state)
  );

  currentPage = 1;
  displayStudents(filtered);
});

// Load students when page loads
loadStudents();
