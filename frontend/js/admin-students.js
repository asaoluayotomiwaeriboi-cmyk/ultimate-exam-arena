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
    document.getElementById('students-tbody').innerHTML = '<tr><td colspan="10" style="text-align: center; color: red;">Error loading students</td></tr>';
  }
}

function displayStudents(students) {
  const tbody = document.getElementById('students-tbody');
  
  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No students found</td></tr>';
    return;
  }

  const start = (currentPage - 1) * studentsPerPage;
  const end = start + studentsPerPage;
  const paginatedStudents = students.slice(start, end);

  tbody.innerHTML = paginatedStudents.map(student => `
    <tr>
      <td><strong>${student.name}</strong></td>
      <td>${student.email}</td>
      <td>${student.phone || '-'}</td>
      <td>${student.state || '-'}</td>
      <td>${student.school || '-'}</td>
      <td>${student.targetCourse || '-'}</td>
      <td>${new Date(student.createdAt).toLocaleDateString()}</td>
      <td>${student.lastLogin ? new Date(student.lastLogin).toLocaleDateString() : 'Never'}</td>
      <td><span class="badge-small badge-active">Active</span></td>
      <td>
        <button class="btn btn-secondary" onclick="viewStudentProfile('${student.id}')">View</button>
      </td>
    </tr>
  `).join('');

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
  const student = allStudents.find(s => s.id === studentId);
  if (student) {
    alert(`${student.name}\n${student.email}\n${student.phone}\n${student.state}, ${student.lga}\n${student.school}\nTarget: ${student.targetCourse}`);
  }
}

document.getElementById('search-btn').addEventListener('click', () => {
  const name = document.getElementById('search-name').value.toLowerCase();
  const email = document.getElementById('search-email').value.toLowerCase();
  const state = document.getElementById('filter-state').value;

  const filtered = allStudents.filter(student => 
    (student.name.toLowerCase().includes(name)) &&
    (student.email.toLowerCase().includes(email)) &&
    (!state || student.state === state)
  );

  currentPage = 1;
  displayStudents(filtered);
});

// Load students when page loads
loadStudents();