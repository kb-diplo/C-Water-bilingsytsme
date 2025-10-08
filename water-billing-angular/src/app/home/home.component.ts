import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  showBackToTop = false;
  activeSection = 'home';

  ngOnInit(): void {
    this.updateActiveSection();
    // Hide the initial loader when home component loads
    this.hideInitialLoader();
  }

  private hideInitialLoader(): void {
    setTimeout(() => {
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.style.display = 'none';
      }
    }, 100);
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.showBackToTop = window.pageYOffset > 300;
    this.updateActiveSection();
  }

  private updateActiveSection(): void {
    const sections = ['home', 'about', 'features'];
    const scrollPosition = window.pageYOffset + 100;

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const offsetTop = element.offsetTop;
        const offsetBottom = offsetTop + element.offsetHeight;
        
        if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
          this.activeSection = section;
          break;
        }
      }
    }
  }

  scrollToSection(sectionId: string, event: Event): void {
    event.preventDefault();
    this.activeSection = sectionId;
    
    if (sectionId === 'home') {
      // For home section, scroll to the very top
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        const navbarHeight = 80; // Account for fixed navbar
        const elementPosition = element.offsetTop - navbarHeight;
        
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
      }
    }
  }

  scrollToTop(): void {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  }
}
