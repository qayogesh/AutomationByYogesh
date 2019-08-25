package com.yogesh.automation.practicePrograms;

public class TC18_CreatingHundredThreads extends Thread {

	public static void main(String[] args) {

		for (int i = 0; i < 100; i++) {
			TC18_CreatingHundredThreads m1 = new TC18_CreatingHundredThreads();
			m1.start();
			System.out.println("Thread name =>" + m1.getName());
			System.out.println("Thread id =>" + m1.currentThread().getId());

			if (Integer.valueOf(m1.getName().split("-")[1]) % 2 == 0) {
				System.out.println("I am ***EVEN*** thread\n");
			} else {
				System.out.println("I am ***ODD*** thread\n");
			}
		}
	}

	public synchronized void run() {
		System.out.println("Thread is running");
	}
}
